import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsEmail, IsHexColor, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role, UserStatus } from '@corpmind/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthPrincipal } from '../common/types/authenticated-request';
import { AdminService } from './admin.service';

const ADMIN_ROLES = [Role.HR_ADMIN, Role.PLATFORM_ADMIN] as const;

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsIn(Object.values(Role))
  role!: Role;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;
}

class UpdateUserStatusDto {
  @IsIn(Object.values(UserStatus))
  status!: UserStatus;
}

class TenantBrandColorsDto {
  @IsOptional()
  @IsHexColor()
  primary?: string;
}

class UpdateTenantSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  platformName?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsObject()
  colors?: TenantBrandColorsDto;

  @IsOptional()
  @IsIn(['banking', 'it', 'retail', 'healthcare', 'manufacturing', 'government'])
  industry?: string;
}

@Controller()
@Roles(...ADMIN_ROLES)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(): Promise<unknown> {
    return this.admin.listUsers();
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.admin.createUser(dto, user);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto): Promise<unknown> {
    return this.admin.updateUserStatus(id, dto);
  }

  @Patch('admin/settings')
  updateTenantSettings(@Body() dto: UpdateTenantSettingsDto, @CurrentUser() user: AuthPrincipal): Promise<unknown> {
    return this.admin.updateTenantSettings(dto, user);
  }
}

export type { CreateUserDto, TenantBrandColorsDto, UpdateTenantSettingsDto, UpdateUserStatusDto };
