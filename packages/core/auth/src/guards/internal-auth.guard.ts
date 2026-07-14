import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { resolveInternalAuthToken } from "../utils/internal-auth.utils";

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const raw = request.headers["x-vxture-internal-auth"];
    const token = Array.isArray(raw) ? raw[0] : raw;

    if (token !== resolveInternalAuthToken()) {
      throw new UnauthorizedException("Unauthorized internal auth request");
    }

    return true;
  }
}
