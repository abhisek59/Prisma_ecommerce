import { prisma } from "../utils/prisma-client.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
// Create a new order from cart
const createOrder = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get user's cart items
    const cartItems = await prisma.cartItem.findMany({
        where: {
            userId
        },
        include: {
            product: true
        }
    });

    if (cartItems.length === 0) {
        throw new ApiError(400, 'Your cart is empty');
    }

    // Calculate total price
    const totalPrice = cartItems.reduce((sum, item) => {
        return sum + (item.quantity * item.product.price);
    }, 0);

    // Create order in transaction
    const order = await prisma.$transaction(async (prisma) => {
        // Create order
        const newOrder = await prisma.order.create({
            data: {
                userId,
                totalPrice,
                status: 'pending'
            }
        });

        // Update product stock
        for (const item of cartItems) {
            if (item.quantity > item.product.stock) {
                throw new ApiError(400, `Not enough stock for ${item.product.name}`);
            }

            await prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: item.product.stock - item.quantity
                }
            });
        }

        // Clear user's cart
        await prisma.cartItem.deleteMany({
            where: {
                userId
            }
        });

        return newOrder;
    });

    res.status(201).json(
        new ApiResponse(201, { order, items: cartItems }, 'Order created successfully')
    );
});

// Get all orders (Admin only)
const getOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter object
    const filter = {};
    if (status) {
        filter.status = status;
    }

    // Get total count for pagination
    const total = await prisma.order.count({ where: filter });

    // Get orders
    const orders = await prisma.order.findMany({
        where: filter,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            payments: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(
        new ApiResponse(200, orders, 'Orders fetched successfully', {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
        })
    );
});

// Get user's orders
const getUserOrders = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter object
    const filter = { userId };
    if (status) {
        filter.status = status;
    }

    // Get total count for pagination
    const total = await prisma.order.count({ where: filter });

    // Get orders
    const orders = await prisma.order.findMany({
        where: filter,
        include: {
            payments: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(
        new ApiResponse(200, orders, 'User orders fetched successfully', {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
        })
    );
});

// Get order details
const getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Build query based on role
    const where = isAdmin ? { id } : { id, userId };

    const order = await prisma.order.findFirst({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            payments: true
        }
    });

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    res.status(200).json(
        new ApiResponse(200, order, 'Order details fetched successfully')
    );
});

// Update order status (Admin only)
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;


    if (!status || !['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(status)) {
        throw new ApiError(400, 'Valid status is required: pending, paid, shipped, delivered, cancelled');
    }

    // Check if order exists
    const orderExists = await prisma.order.findUnique({
        where: { id }
    });

    if (!orderExists) {
        throw new ApiError(404, 'Order not found');
    }

    // Update order
    const order = await prisma.order.update({
        where: { id },
        data: {
            status
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            payments: true
        }
    });

    res.status(200).json(
        new ApiResponse(200, order, 'Order status updated successfully')
    );
});

export {
    createOrder,
    getOrders,
    getUserOrders,
    getOrderById,
    updateOrderStatus
};