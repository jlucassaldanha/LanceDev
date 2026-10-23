import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma, Role, User } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';

const userRepository = new UserRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_desafio_verzel';

interface LoginDTO {
  email: string;
  password: string;
}

export class AuthService {
  async register(data: Prisma.UserCreateInput): Promise<Omit<User, 'password'>> {
    const { name, email, password, role } = data;

    if (!name || !email || !password || !role) {
      throw new Error('FIELDS_MISSING');
    }

    if (role !== Role.LEILOEIRO && role !== Role.LICITANTE) {
      throw new Error('INVALID_ROLE');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await userRepository.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(data: LoginDTO): Promise<{ user: Omit<User, 'password'>; token: string }> {
    const { email, password } = data;

    if (!email || !password) {
      throw new Error('FIELDS_MISSING');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('USER_NOT_FOUND')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS')
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }
}