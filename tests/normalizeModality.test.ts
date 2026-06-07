// Teste UNITÁRIO puro
import { test, expect } from 'vitest'
import { normalizeModality } from '../src/modules/whatsapp/whatsapp.service.js'

// ─── Casos que devem retornar um valor válido ────────────────────────────────

test("'remoto' → 'Remoto'", () => {
  expect(normalizeModality('remoto')).toBe('Remoto')
})

test("'REMOTO' (maiúsculo) → 'Remoto'", () => {
  expect(normalizeModality('REMOTO')).toBe('Remoto')
})

test("'Híbrido' (com acento) → 'Hibrido'", () => {
  // A função usa normalize('NFD') para remover acentos antes de comparar
  expect(normalizeModality('Híbrido')).toBe('Hibrido')
})

test("'hibrido' (sem acento) → 'Hibrido'", () => {
  expect(normalizeModality('hibrido')).toBe('Hibrido')
})

test("'hybrid' (inglês) → 'Hibrido'", () => {
  expect(normalizeModality('hybrid')).toBe('Hibrido')
})

test("'home office' → 'Home Office'", () => {
  expect(normalizeModality('home office')).toBe('Home Office')
})

test("'HOME OFFICE' (maiúsculo) → 'Home Office'", () => {
  expect(normalizeModality('HOME OFFICE')).toBe('Home Office')
})

test("'presencial' → 'Presencial'", () => {
  expect(normalizeModality('presencial')).toBe('Presencial')
})

test("'Presencial' (capitalizado) → 'Presencial'", () => {
  expect(normalizeModality('Presencial')).toBe('Presencial')
})

// ─── Casos que devem retornar null ───────────────────────────────────────────

test('null → null', () => {
  // Valor nulo: usuário não informou modalidade
  expect(normalizeModality(null)).toBeNull()
})

test("string vazia '' → null", () => {
  // String vazia é falsy, mesma lógica do null
  expect(normalizeModality('')).toBeNull()
})

test("'freelancer' (string desconhecida) → null", () => {
  // Não bate com nenhum dos padrões conhecidos
  expect(normalizeModality('freelancer')).toBeNull()
})

test("'CLT' → null", () => {
  // Tipo de contrato, não modalidade de trabalho
  expect(normalizeModality('CLT')).toBeNull()
})
