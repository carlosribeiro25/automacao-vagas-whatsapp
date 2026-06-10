import { fakerPT_BR as faker } from '@faker-js/faker';
import { db } from '../db/index.js';
import { vagas } from '../db/schema.js';
export async function makeVaga() {
    const insertVaga = await db
        .insert(vagas)
        .values([
        {
            title: 'Desenvolver dor fullstack',
            message: faker.lorem.words(4),
            mensagemId: null,
            tipo_vaga: faker.lorem.word(),
            description: faker.lorem.words(4),
            category: faker.lorem.word(),
            company: faker.lorem.words(2),
            texto_extraido: faker.lorem.words(4),
            imagem_original_url: faker.internet.url(),
            requirements: faker.lorem.words(4),
            modality: faker.helpers.arrayElement([
                'Remoto',
                'Hibrido',
                'Presencial',
                'Home Office',
            ]),
            salary: String(faker.number.int({ min: 1, max: 30000 })),
            benefits: faker.lorem.words(4),
            group_name: faker.lorem.words(4),
            contact: faker.lorem.words(4),
            link: faker.internet.url(),
            location: faker.lorem.words(2),
            is_job: true,
        },
    ])
        .returning({ id: vagas.id });
    return insertVaga[0].id;
}
makeVaga()
    .then((id) => console.log('Vaga criada com id:', id))
    .catch(console.error);
