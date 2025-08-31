import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse Prisma schema to extract models
 */
function parsePrismaSchema() {
    try {
        const schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        const models = {};
        const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
        let match;

        while ((match = modelRegex.exec(schemaContent)) !== null) {
            const modelName = match[1];
            const modelBody = match[2];
            
            const properties = {};
            const required = [];
            
            // Parse fields
            const fieldRegex = /(\w+)\s+(\w+)(\[\])?\s*(@.*)?/g;
            let fieldMatch;
            
            while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
                const fieldName = fieldMatch[1];
                const fieldType = fieldMatch[2];
                const isArray = fieldMatch[3] === '[]';
                const attributes = fieldMatch[4] || '';
                
                // Skip relation fields and internal fields
                if (fieldName === 'id' || attributes.includes('@relation')) continue;
                
                let swaggerType = 'string';
                switch (fieldType) {
                    case 'Int':
                    case 'BigInt':
                        swaggerType = 'integer';
                        break;
                    case 'Float':
                    case 'Decimal':
                        swaggerType = 'number';
                        break;
                    case 'Boolean':
                        swaggerType = 'boolean';
                        break;
                    case 'DateTime':
                        swaggerType = 'string';
                        properties[fieldName] = { type: swaggerType, format: 'date-time' };
                        break;
                    default:
                        swaggerType = 'string';
                }
                
                if (!properties[fieldName]) {
                    properties[fieldName] = isArray 
                        ? { type: 'array', items: { type: swaggerType } }
                        : { type: swaggerType };
                }
                
                // Check if field is required (not optional with ?)
                if (!attributes.includes('?') && !attributes.includes('@default')) {
                    required.push(fieldName);
                }
            }
            
            models[modelName] = { properties, required };
        }
        
        return models;
    } catch (error) {
        console.warn('Could not parse Prisma schema:', error.message);
        return {};
    }
}

/**
 * Parse route comments for Swagger documentation
 */
function parseRouteComments(routesDir) {
    const paths = {};
    const tags = new Set();
    
    try {
        const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
        
        routeFiles.forEach(file => {
            const filePath = path.join(routesDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Extract tag from filename
            const tag = file.replace('.router.js', '').replace('.js', '');
            tags.add(tag);
            
            // Basic route parsing - you can enhance this
            const routeRegex = /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
            let match;
            
            while ((match = routeRegex.exec(content)) !== null) {
                const method = match[1].toLowerCase();
                const route = match[2];
                const fullPath = route.startsWith('/') ? route : `/${route}`;
                
                if (!paths[fullPath]) {
                    paths[fullPath] = {};
                }
                
                paths[fullPath][method] = {
                    tags: [tag],
                    summary: `${method.toUpperCase()} ${fullPath}`,
                    responses: {
                        '200': {
                            description: 'Success',
                            content: {
                                'application/json': {
                                    schema: { type: 'object' }
                                }
                            }
                        },
                        '400': { description: 'Bad Request' },
                        '401': { description: 'Unauthorized' },
                        '500': { description: 'Internal Server Error' }
                    }
                };
                
                // Add authentication requirement for protected routes
                if (content.includes('auth.middleware') || content.includes('authenticateToken')) {
                    paths[fullPath][method].security = [{ bearerAuth: [] }];
                }
            }
        });
    } catch (error) {
        console.warn('Could not parse route files:', error.message);
    }
    
    return { paths, tags: Array.from(tags) };
}

/**
 * Set up Swagger documentation
 */
function setupSwagger(app) {
    // Parse Prisma schema to get models
    const prismaModels = parsePrismaSchema();

    // Parse route comments
    const routesDir = path.join(__dirname, '../routes');
    const { paths, tags } = parseRouteComments(routesDir);

    // Generate schemas section from Prisma models
    const schemas = {};
    Object.keys(prismaModels).forEach(modelName => {
        const model = prismaModels[modelName];
        schemas[modelName] = {
            type: 'object',
            properties: model.properties,
            required: model.required
        };

        // Add special case for register and login
        if (modelName === 'User') {
            schemas['UserRegister'] = {
                type: 'object',
                properties: {
                    name: model.properties.name || { type: 'string' },
                    email: model.properties.email || { type: 'string', format: 'email' },
                    password: { type: 'string', format: 'password' }
                },
                required: ['name', 'email', 'password']
            };

            schemas['UserLogin'] = {
                type: 'object',
                properties: {
                    email: model.properties.email || { type: 'string', format: 'email' },
                    password: { type: 'string', format: 'password' }
                },
                required: ['email', 'password']
            };
        }

        // Add Product schemas if exists
        if (modelName === 'Product') {
            schemas['ProductCreate'] = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    price: { type: 'number' },
                    category: { type: 'string' },
                    stock: { type: 'integer' }
                },
                required: ['name', 'price']
            };
        }
    });

    // Create tag definitions
    const tagDefinitions = tags.map(tag => ({
        name: tag,
        description: `Operations related to ${tag}`
    }));

    // Swagger JSDoc options
    const options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'E-Commerce API',
                version: '1.0.0',
                description: 'API documentation for the E-Commerce application built with Node.js, Express, and Prisma',
                contact: {
                    name: 'API Support',
                    email: 'support@ecommerce.com'
                },
                license: {
                    name: 'MIT',
                    url: 'https://opensource.org/licenses/MIT'
                }
            },
            servers: [
                {
                    url: `http://localhost:${process.env.PORT || 8000}`,
                    description: 'Development server'
                },
                {
                    url: 'https://your-production-url.com',
                    description: 'Production server'
                }
            ],
            tags: tagDefinitions,
            paths,
            components: {
                schemas,
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Enter JWT token'
                    }
                },
                parameters: {
                    id: {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'Resource ID'
                    }
                }
            }
        },
        apis: [
            path.join(__dirname, '../routes/*.js'),
            path.join(__dirname, '../controllers/*.js')
        ]
    };

    // Generate specification
    const swaggerSpec = swaggerJsdoc(options);

    // Swagger UI options
    const swaggerOptions = {
        explorer: true,
        swaggerOptions: {
            docExpansion: 'none',
            filter: true,
            showRequestDuration: true
        },
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info .title { color: #3b82f6 }
        `,
        customSiteTitle: 'E-Commerce API Documentation'
    };

    // Serve Swagger docs
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
    console.log(`📚 Swagger docs available at http://localhost:${process.env.PORT || 8000}/api-docs`);
}

export default setupSwagger;