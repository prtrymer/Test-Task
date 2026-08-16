import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NotFoundError } from '../../../../shared/domain/domain-error';
import { Caller } from '../../../sharing/application/access-resolver';
import { AuthenticateUserHandler } from '../../application/commands/authenticate-user.handler';
import {
  MIN_PASSWORD_LENGTH,
  RegisterUserHandler,
} from '../../application/commands/register-user.handler';
import { UserRepositoryPort } from '../../application/ports/user.repository';
import { AuthenticatedGuard } from './authenticated.guard';
import { CurrentCaller } from './current-user.decorator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly register_: RegisterUserHandler,
    private readonly authenticate: AuthenticateUserHandler,
    private readonly users: UserRepositoryPort,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const { user, tokens } = await this.register_.execute(body);
    return { user, ...tokens };
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const { user, tokens } = await this.authenticate.execute(body);
    return { user, ...tokens };
  }

  @Get('me')
  @UseGuards(AuthenticatedGuard)
  async me(@CurrentCaller() caller: Caller) {
    const user = await this.users.findById(caller.userId as string);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
}
