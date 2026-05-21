import { expressjwt } from 'express-jwt';
import config from '../config.json';
import db from '../_helpers/db';

const { secret } = config;

export default function authorize(roles: any = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  // Return an array of middleware steps to execute sequentially
  return [
    // Step 1: Extract, verify JWT token, and attach payload properties to req.auth
    expressjwt({ secret, algorithms: ['HS256'] }),

    // Step 2: Validate database rules against the authenticated subject profile
    async (req: any, res: any, next: any) => {
      // Note: express-jwt v7+ populates 'req.auth' instead of 'req.user' by default
      const authUser = req.auth || req.user;

      if (!authUser) {
        return res.status(401).json({ message: 'Unauthorized: Missing session payload token.' });
      }

      const account = await db.Account.findByPk(authUser.id);

      if (!account || (roles.length && !roles.includes(account.role))) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Sync identity profiles smoothly across the connection pipeline
      req.user = account; 
      req.user.role = account.role;
      
      const refreshTokens = await account.getRefreshTokens();
      req.user.ownsToken = (token: any) =>
        !!refreshTokens.find((x: any) => x.token === token);

      next();
    }
  ];
}