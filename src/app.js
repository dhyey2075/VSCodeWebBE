import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/workspace', workspaceRoutes);

export default app;
