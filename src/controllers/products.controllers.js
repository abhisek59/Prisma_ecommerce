import { prisma } from '../utils/prisma-client.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all products with pagination and filtering
const getProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, category, minPrice, maxPrice, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter object
    const filter = {};

    if (category) {
        filter.category = category;
    }

    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.gte = parseFloat(minPrice);
        if (maxPrice) filter.price.lte = parseFloat(maxPrice);
    }

    if (search) {
        filter.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
        ];
    }

    const total = await prisma.product.count({ where: filter });

    const products = await prisma.product.findMany({
        where: filter,
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy]: order }
    });

    res.status(200).json(
        new ApiResponse(200, {
            products,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        }, 'Products fetched successfully')
    );
});


const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
        where: { id }
    });

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    res.status(200).json(
        new ApiResponse(200, product, 'Product fetched successfully')
    );
});

const createProduct = asyncHandler(async (req, res) => {
    const { name, description, price, stock, category } = req.body;

    if (!name || !description || !price || stock === undefined || !category) {
        throw new ApiError(400, 'Please provide all required fields: name, description, price, stock, category');
    }

    // Handle file upload
    let image = null;
    if (req.file) {
        // Generate image URL based on server domain and file path
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        image = `${baseUrl}/storage/uploads/${req.file.filename}`;
    }

    const product = await prisma.product.create({
        data: {
            name,
            description,
            price: parseFloat(price),
            stock: parseInt(stock),
            category,
            image
        }
    });

    res.status(201).json(
        new ApiResponse(201, product, 'Product created successfully')
    );
});


const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, category } = req.body;


    const productExists = await prisma.product.findUnique({
        where: { id }
    });

    if (!productExists) {
        throw new ApiError(404, 'Product not found');
    }

    // Handle file upload
    let image = undefined;
    if (req.file) {
        // Delete old image if exists
        if (productExists.image) {
            const oldImagePath = productExists.image.split('/storage/uploads/')[1];
            if (oldImagePath) {
                const fullPath = path.join(__dirname, '../storage/uploads', oldImagePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        }

        // Generate new image URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        image = `${baseUrl}/storage/uploads/${req.file.filename}`;
    }

    const product = await prisma.product.update({
        where: { id },
        data: {
            name: name !== undefined ? name : undefined,
            description: description !== undefined ? description : undefined,
            price: price !== undefined ? parseFloat(price) : undefined,
            stock: stock !== undefined ? parseInt(stock) : undefined,
            category: category !== undefined ? category : undefined,
            image: image
        }
    });

    res.status(200).json(
        new ApiResponse(200, product, 'Product updated successfully')
    );
});


const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const productExists = await prisma.product.findUnique({
        where: { id }
    });

    if (!productExists) {
        throw new ApiError(404, 'Product not found');
    }

    // Delete product image if exists
    if (productExists.image) {
        const imagePath = productExists.image.split('/storage/uploads/')[1];
        if (imagePath) {
            const fullPath = path.join(__dirname, '../storage/uploads', imagePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }
    }

    // Delete product
    await prisma.product.delete({
        where: { id }
    });

    res.status(200).json(
        new ApiResponse(200, {}, 'Product deleted successfully')
    );
});

export {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};