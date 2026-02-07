import { supabase } from "../config/supabase.js";

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];

        const { data, error } = await supabase.auth.getClaims(token);
        
        if (error) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        console.log('Data in Middleware: ', data.claims);

        req.user = data.claims;
        next();
    } catch (error) {
        console.error('Error in authenticate middleware: ', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}