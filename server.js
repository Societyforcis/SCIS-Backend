import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import notificationRoutes from './routes/notificationRoutes.js';
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import connectDB from "./config/db.js";
import bodyParser from 'body-parser';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);


app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json({ limit: '10mb' }));


const corsOptions = {
  origin: ['http://localhost:5173', 'https://scis-frontend.vercel.app','https://societycis.org'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes - make sure this comes BEFORE the 404 handler
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Update this line to explicitly show the route prefix
console.log('Registering /api/membership routes...');
app.use('/api/membership', membershipRoutes);

app.use('/api/newsletter', newsletterRoutes);
app.use('/api/notifications', notificationRoutes);

app.get("/", (req, res) => {
  res.send("Welcome to Cyber Intelligent System");
});

// Debug routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something broke!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

// Add this before the server starts listening
console.log('API Routes:');
console.log('===========');

// Helper function to print routes
function printRoutes(stack, basePath = '') {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter(method => layer.route.methods[method])
        .join(', ')
        .toUpperCase();
      
      console.log(`${methods} ${basePath}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      // It's a router middleware
      let path = basePath;
      if (layer.regexp && layer.regexp.source !== '^\\/?(?=\\/|$)') {
        // Extract the base path of the router
        const match = layer.regexp.toString().match(/\^\\\/?(?:\\\/([^\\\/]+))?/);
        if (match && match[1]) {
          path += '/' + match[1].replace(/\\\//g, '/');
        }
      }
      printRoutes(layer.handle.stack, path);
    }
  }
}

try {
  printRoutes(app._router.stack);
} catch (err) {
  console.error('Error printing routes:', err);
}

console.log('===========');

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});