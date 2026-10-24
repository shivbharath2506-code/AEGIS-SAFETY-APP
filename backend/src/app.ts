import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { generalApiLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { isDbConnected } from './database/connection';

// Route imports
import usersRoutes from './modules/users/users.routes';
import emergencyContactsRoutes from './modules/emergency_contacts/emergency_contacts.routes';
import sosRoutes from './modules/sos/sos.routes';
import locationRoutes from './modules/location/location.routes';
import routesRoutes from './modules/routes/routes.routes';
import nearbyServicesRoutes from './modules/nearby_services/nearby_services.routes';
import safetyDataRoutes from './modules/safety_data/safety_data.routes';

import path from 'path';

const app: Express = express();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(cors({ origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve static interactive web app
app.use(express.static(path.join(__dirname, '../public')));

// Apply general rate limiter
app.use(generalApiLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'AEGIS Emergency and Intelligent Safety API',
    cityFocus: 'Chennai, Tamil Nadu',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    databaseConnected: isDbConnected(),
    mockAuthActive: config.DEV_MOCK_AUTH,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: Math.round(process.memoryUsage().rss / (1024 * 1024))
  });
});

// Mount Versioned API Routes (/api/v1)
const apiV1Router = express.Router();
apiV1Router.use('/users', usersRoutes);
apiV1Router.use('/emergency-contacts', emergencyContactsRoutes);
apiV1Router.use('/sos', sosRoutes);
apiV1Router.use('/location-sessions', locationRoutes);
apiV1Router.use('/routes', routesRoutes);
apiV1Router.use('/nearby-services', nearbyServicesRoutes);
apiV1Router.use('/safety-data', safetyDataRoutes);

app.use(config.API_PREFIX, apiV1Router);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
