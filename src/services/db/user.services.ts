import { User } from '@prisma/client'
import prisma from '~/prisma.client'
import bcrypt from 'bcrypt'
import { BadRequestError, NotAuthorizedError, NotFoundError } from '~/globals/error-handler'
import jwt from 'jsonwebtoken'

class UserService {
  public async createUser(requestBody: User) {
    if (await this.isEmailExist(requestBody.email)) {
      throw new BadRequestError(`The email ${requestBody.email} already exist!`)
    }

    const hashedPassword = await bcrypt.hash(requestBody.password, 8)

    const user = await prisma.user.create({
      data: {
        ...requestBody,
        password: hashedPassword,
        role: 'USER'
      }
    })

    const token = this.createJwt(user)

    return { user, token }
  }

  public async loginUser(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      throw new NotAuthorizedError('Invalid email or password')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new NotAuthorizedError('Invalid email or password')
    }

    const token = this.createJwt(user)
    return { user, token }
  }

  private async isEmailExist(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: {
        email
      }
    })

    return count > 0
  }

  private createJwt(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      address: user.address
    }

    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '3d' })
  }

  public async findUsers() {
    return await prisma.user.findMany()
  }

  public async getSocialMedia(type: string, email: string) {
    const user = await prisma.user.findFirst({
      where: {
        type,
        email
      }
    })

    if (!user) {
      throw new NotFoundError(`User with email ${email} does not exist`)
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      address: user.address
    }

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '3d' })

    return {
      user,
      accessToken
    }
  }
}

export const userService: UserService = new UserService()
