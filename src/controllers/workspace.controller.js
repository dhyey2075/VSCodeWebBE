import { supabase } from '../config/supabase.js';

export const getWorkspaces = async (req, res) => {
    console.log('User in Workspace Controller: ', req.user);
    const { data, error } = await supabase.from('workspaces').select('*').eq('ownerEmail', req.user.email);
    if (error) {
        return res.status(500).json({ message: error.message });
    }
    res.status(200).json({
        message: 'Workspaces fetched successfully',
        data,
    });
};

export const createWorkspace = async (req, res) => {
    const { containerId } = req.body;
    const { error } = await supabase.from('workspaces').insert({
        ownerEmail: req.user.email,
        containerId,
        status: 'CREATING',
        lastActiveAt: new Date(),
    });
    if (error) {
        return res.status(500).json({ message: error.message });
    }
    res.status(201).json({
        message: 'Workspace created successfully'
    });
};

export const deleteWorkspace = async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('workspaces').delete().eq('id', id);
    if (error) {
        return res.status(500).json({ message: error.message });
    }
    res.status(200).json({ message: 'Workspace deleted successfully' });
};

export const updateWorkspaceStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { data, error } = await supabase.from('workspaces').update({ status, lastActiveAt: new Date() }).eq('id', id);
    if (error) {
        return res.status(500).json({ message: error.message });
    }
    res.status(200).json({ message: 'Workspace status updated successfully' });
};