import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './is-public.constant';

// Marks a route (or a whole controller) as reachable without a token,
// overriding the app-wide GlobalJwtAuthGuard.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
