import { supabase } from '../config/supabase.js';
export const getMe = async (req, res) => {
    res.status(200).json({
      user: req.user,
    });
  };

export const login = async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) {
        return res.status(401).json({ message: error.message || 'Invalid credentials' });
    }
    res.status(200).json({
        data,
        message: 'Login successful',
    });
};

export const signup = async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    if (error) {
        return res.status(400).json({ message: error.message || 'Signup failed' });
    }
    res.status(201).json({
        data,
        message: 'Signup successful',
    });
};