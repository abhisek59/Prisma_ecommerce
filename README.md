# Prisma E-commerce Backend

A robust Node.js e-commerce backend API built with Express.js, Prisma ORM, and PostgreSQL. This project provides a complete backend solution for an e-commerce platform with user authentication, product management, shopping cart, order processing, and payment integration.

## 🚀 Features

- **User Management**: Registration, login, authentication with JWT tokens
- **Product Management**: CRUD operations for products with image upload
- **Shopping Cart**: Add/remove items, quantity management
- **Order Processing**: Order creation, status management
- **Payment Integration**: PayPal integration for secure payments
- **File Upload**: Image upload for products using Multer
- **Database**: PostgreSQL with Prisma ORM
- **Security**: bcrypt password hashing, JWT authentication
- **CORS**: Configurable cross-origin resource sharing

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **File Upload**: Multer
- **Payment**: PayPal SDK
- **Development**: Nodemon for hot reloading

## 📁 Project Structure

```
server/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── controllers/           # Route controllers
│   │   ├── cart.controller.js
│   │   ├── order.controller.js
│   │   ├── payment.controllers.js
│   │   ├── products.controllers.js
│   │   └── user.controllers.js
│   ├── middleware/            # Custom middleware
│   │   ├── auth.middleware.js
│   │   └── upload.middleware.js
│   ├── routes/                # API routes
│   │   ├── cart.router.js
│   │   ├── order.router.js
│   │   ├── payment.router.js
│   │   ├── product.router.js
│   │   ├── user.router.js
│   │   └── index.js
│   ├── storage/uploads/       # File uploads
│   ├── utils/                 # Utility functions
│   │   ├── apiError.js
│   │   ├── apiResponse.js
│   │   ├── asyncHandler.js
│   │   ├── password.js
│   │   ├── paypal.js
│   │   └── prisma-client.js
│   ├── app.js                 # Express app configuration
│   └── index.js               # Server entry point
├── package.json
└── README.md
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

### 1. Clone the repository

```bash
git clone <repository-url>
cd prisma-Ecommerce/server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/ecommerce_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# Server
PORT=8000
CORS_ORIGIN="http://localhost:3000"

# PayPal (for payment integration)
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-client-secret"
PAYPAL_MODE="sandbox" # or "live" for production
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed the database
npx prisma db seed
```

### 5. Start the development server

```bash
npm run dev
```

The server will start on `http://localhost:8000`

## 📊 Database Schema

The application uses the following main entities:

- **User**: User accounts with authentication
- **Product**: Product catalog with details and images
- **CartItem**: Shopping cart functionality
- **Order**: Order management
- **Payment**: Payment processing records

## 🛡️ API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:id` - Update cart item quantity
- `DELETE /api/cart/:id` - Remove item from cart

### Orders
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order status (Admin)

### Payments
- `POST /api/payments/create` - Create payment
- `POST /api/payments/execute` - Execute PayPal payment
- `GET /api/payments/:id` - Get payment details

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

- Access tokens expire in 15 minutes
- Refresh tokens are stored in HTTP-only cookies
- Protected routes require valid JWT token in Authorization header
- Format: `Authorization: Bearer <token>`

## 📁 File Upload

Product images are handled via Multer middleware:
- Supported formats: JPEG, PNG, GIF
- Storage: Local filesystem (`src/storage/uploads/`)
- Max file size: 5MB
- Files accessible via: `/storage/uploads/<filename>`

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Format code with Prettier
npx prettier --write .

# Database operations
npx prisma studio          # Open Prisma Studio
npx prisma migrate dev      # Run migrations
npx prisma generate         # Generate client
npx prisma db push          # Push schema to database
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | Yes |
| `PORT` | Server port (default: 8000) | No |
| `CORS_ORIGIN` | Allowed CORS origin | No |
| `PAYPAL_CLIENT_ID` | PayPal client ID | Yes (for payments) |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret | Yes (for payments) |
| `PAYPAL_MODE` | PayPal environment (sandbox/live) | Yes (for payments) |

## 🐛 Common Issues & Solutions

### Database Connection Issues
```bash
# Check if PostgreSQL is running
brew services list | grep postgres

# Start PostgreSQL service
brew services start postgresql
```

### Migration Errors
```bash
# Reset database (caution: deletes all data)
npx prisma migrate reset

# Generate and apply migration
npx prisma migrate dev --name <migration-name>
```

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

## 🚀 Deployment

### Production Setup

1. Set environment to production:
```env
NODE_ENV=production
PAYPAL_MODE=live
```

2. Build and optimize:
```bash
npm install --production
npx prisma generate
npx prisma migrate deploy
```

3. Use PM2 for process management:
```bash
npm install -g pm2
pm2 start src/index.js --name "ecommerce-api"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and commit: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 📞 Support

For support and questions, please create an issue in the repository or contact the development team.

---

**Happy Coding! 🎉**