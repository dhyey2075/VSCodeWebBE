import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getWorkspaces, createWorkspace, deleteWorkspace, updateWorkspaceStatus } from '../controllers/workspace.controller.js';
import { getFileOrList, writeFileHandler } from '../controllers/files.controller.js';

const router = express.Router();

router.get('/', authenticate, getWorkspaces);
router.post('/', authenticate, createWorkspace);
router.get('/:id/files', authenticate, getFileOrList);
router.put('/:id/files', authenticate, writeFileHandler);
router.delete('/:id', authenticate, deleteWorkspace);
router.put('/:id', authenticate, updateWorkspaceStatus);

export default router;