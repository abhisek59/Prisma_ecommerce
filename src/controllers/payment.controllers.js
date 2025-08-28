import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import { prisma } from '../utils/prisma-client.js';
import { client } from '../utils/paypal.js';

// Initiate PayPal payment
const initiatePayment = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
        throw new ApiError(400, 'Order ID is required');
    }

    // Verify order exists and belongs to user
    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            userId
        }
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    if (order.status !== 'pending') {
        throw new ApiError(400, `Cannot process payment for order with status: ${order.status}`);
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
        where: {
            orderId,
            status: { not: 'failed' }
        }
    });

    if (existingPayment) {
        throw new ApiError(400, 'Payment already exists for this order');
    }

    // Create PayPal order
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
            {
                amount: {
                    currency_code: 'USD',
                    value: order.totalPrice.toFixed(2)
                },
                reference_id: orderId
            }
        ],
        application_context: {
            brand_name: 'E-Commerce Store',
            landing_page: 'BILLING',
            user_action: 'PAY_NOW',
            return_url: `${process.env.FRONTEND_URL}/payment/success`,
            cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
        }
    });

    try {
        // Call PayPal API
        const paypalOrder = await client.execute(request);

        // Create a payment record
        const payment = await prisma.payment.create({
            data: {
                orderId,
                userId,
                amount: order.totalPrice,
                status: 'pending',
                transactionId: paypalOrder.result.id
            }
        });

        // Find approval URL
        const approvalUrl = paypalOrder.result.links.find(link => link.rel === 'approve').href;

        res.status(200).json(
            new ApiResponse(200, {
                paymentId: payment.id,
                transactionId: paypalOrder.result.id,
                approvalUrl
            }, 'Payment initiated successfully')
        );
    } catch (error) {
        console.error('PayPal API error:', error);
    throw new ApiError(500, 'Error initiating PayPal payment');
    }
});

// Verify payment status
const verifyPaymentStatus = asyncHandler(async (req, res) => {
    const { transactionId } = req.query;

    if (!transactionId) {
        throw new ApiError(400, 'Transaction ID is required');
    }

    // Find payment by transaction ID
    const payment = await prisma.payment.findFirst({
        where: {
            transactionId
        },
        include: {
            order: true
        }
    });

    if (!payment) {
        throw new ApiError(404, 'Payment not found');
    }

    // Create PayPal order get request
    const request = new checkoutNodeJssdk.orders.OrdersGetRequest(transactionId);

    try {
        // Call PayPal API
        const paypalOrder = await client.execute(request);
        const paypalStatus = paypalOrder.result.status;

        // Map PayPal status to our status
        let paymentStatus;
        if (paypalStatus === 'COMPLETED') {
            paymentStatus = 'completed';
        } else if (paypalStatus === 'SAVED' || paypalStatus === 'APPROVED' || paypalStatus === 'PAYER_ACTION_REQUIRED') {
            paymentStatus = 'pending';
        } else {
            paymentStatus = 'failed';
        }

        // Update payment status if different
        if (payment.status !== paymentStatus) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: { status: paymentStatus }
            });

            // If payment completed, update order status too
            if (paymentStatus === 'completed') {
                await prisma.order.update({
                    where: { id: payment.orderId },
                    data: { status: 'paid' }
                });
            }
        }

        res.status(200).json(
            new ApiResponse(200, {
                paymentId: payment.id,
                transactionId,
                status: paymentStatus,
                paypalStatus,
                order: payment.order
            }, 'Payment status verified')
        );
    } catch (error) {
        console.error('PayPal API error:', error);
    throw new ApiError(500, 'Error verifying PayPal payment status');
    }
});

// Capture and confirm PayPal payment
const capturePayment = asyncHandler(async (req, res) => {
    const { transactionId } = req.body;
    const userId = req.user.id;

    if (!transactionId) {
        throw new ApiError(400, 'Transaction ID is required');
    }

    // Find payment by transaction ID
    const payment = await prisma.payment.findFirst({
        where: {
            transactionId,
            userId
        },
        include: {
            order: true
        }
    });

    if (!payment) {
        throw new ApiError(404, 'Payment not found');
    }

    if (payment.status === 'completed') {
        return res.status(200).json(
            new ApiResponse(200, {
                paymentId: payment.id,
                transactionId,
                status: payment.status,
                order: payment.order
            }, 'Payment already completed')
        );
    }

    // Create PayPal capture request
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(transactionId);
    request.requestBody({});

    try {
        // Call PayPal API
        const capture = await client.execute(request);

        if (capture.result.status === 'COMPLETED') {
            // Update payment and order status
            await prisma.$transaction([
                prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: 'completed' }
                }),
                prisma.order.update({
                    where: { id: payment.orderId },
                    data: { status: 'paid' }
                })
            ]);

            // Get updated payment with order
            const updatedPayment = await prisma.payment.findUnique({
                where: { id: payment.id },
                include: { order: true }
            });

            res.status(200).json(
                new ApiResponse(200, {
                    paymentId: updatedPayment.id,
                    transactionId,
                    status: 'completed',
                    order: updatedPayment.order
                }, 'Payment captured successfully')
            );
        } else {
            throw new ApiError(500, 'Payment capture failed');
        }
    } catch (error) {
        console.error('PayPal API error:', error);

        // Update payment status to failed
        await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'failed' }
        });

    throw new ApiError(500, 'Error capturing PayPal payment');
    }
});

// Get payment details (Admin only)
const getPaymentById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
            order: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });

    if (!payment) {
        throw new ApiError(404, 'Payment not found');
    }

    res.status(200).json(
        new ApiResponse(200, payment, 'Payment details fetched successfully')
    );
});

// Get user's payment history
const getUserPayments = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter object
    const filter = { userId };
    if (status) {
        filter.status = status;
    }

    // Get total count for pagination
    const total = await prisma.payment.count({ where: filter });

    // Get payments
    const payments = await prisma.payment.findMany({
        where: filter,
        include: {
            order: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(
        new ApiResponse(200, payments, 'User payments fetched successfully', {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
        })
    );
});

export {
    initiatePayment,
    verifyPaymentStatus,
    capturePayment,
    getPaymentById,
    getUserPayments
};