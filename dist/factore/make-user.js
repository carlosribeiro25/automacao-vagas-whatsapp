import { users } from '@/db/schema.js';
import { db } from '@/db/index.js';
import { fakerPT_BR as faker } from '@faker-js/faker';
import { hash } from 'argon2';
import jwt from 'jsonwebtoken';
export async function makeUser(role) {
    const passwordHash = 'dev4837';
    const insertUser = await db
        .insert(users)
        .values({
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        phone: faker.phone.number(),
        password: await hash(passwordHash),
        role: role,
    })
        .returning();
    return {
        user: insertUser[0],
        passwordHash,
    };
}
export async function authenticationUser(role) {
    const { user, passwordHash } = await makeUser(role);
    const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET);
    return { user, token, passwordHash };
}
