import { users } from './schema.js'
import { db } from './index.js'
import { fakerPT_BR as faker } from '@faker-js/faker'
import { hash } from 'argon2'

const passwordHash = await hash('748596')

export async function seed() {
  const insertUser = await db
    .insert(users)
    .values({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number(),
      password: passwordHash,
      role: 'user',
    })
    .returning()

  return insertUser[0]
}

seed()
