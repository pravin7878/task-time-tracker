import { User } from '../models/user.model';
import { RegisterDTO, LoginDTO, AuthResult, AuthUserResponse } from '../types/auth.types';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/token';
import {
  createBadRequestError,
  createUnauthorizedError,
  createNotFoundError,
} from '../utils/errors';

export const register = async (data: RegisterDTO): Promise<AuthResult> => {
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throw createBadRequestError('An account with this email address already exists');
  }

  const passwordHash = await hashPassword(data.password);

  const newUser = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
  });

  const token = generateToken({
    userId: newUser._id.toString(),
    email: newUser.email,
  });

  const userResponse: AuthUserResponse = {
    id: newUser._id.toString(),
    name: newUser.name,
    email: newUser.email,
    createdAt: newUser.createdAt.toISOString(),
  };

  return {
    user: userResponse,
    token,
  };
};

export const login = async (data: LoginDTO): Promise<AuthResult> => {
  const user = await User.findOne({ email: data.email }).select('+passwordHash');
  if (!user) {
    throw createUnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await comparePassword(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw createUnauthorizedError('Invalid email or password');
  }

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
  });

  const userResponse: AuthUserResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };

  return {
    user: userResponse,
    token,
  };
};

export const getCurrentUser = async (userId: string): Promise<AuthUserResponse> => {
  const user = await User.findById(userId);
  if (!user) {
    throw createNotFoundError('User not found');
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
};
