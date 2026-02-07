import express from 'express';
import { getMe, login, signup } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/me', authenticate, getMe);
router.post('/login', login);
router.post('/signup', signup);
export default router;
