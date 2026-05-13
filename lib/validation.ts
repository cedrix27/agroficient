import { z } from 'zod'

const allowedLangues = ['fr', 'moore', 'dioula', 'fulfude'] as const

export const zoneSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  langue: z.enum(allowedLangues).default('fr'),
  radiusKm: z.coerce.number().min(1).max(300),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  cultures: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  organisationId: z.string().trim().min(1).optional()
})

export const agriculteurSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  telephone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Telephone invalide (format international requis)'),
  zone: z.string().trim().min(2).max(120),
  langue: z.enum(allowedLangues).default('fr'),
  actif: z.boolean().default(true)
})

export const updateZoneSchema = zoneSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Aucune valeur fournie pour la mise a jour'
})

export const updateAgriculteurSchema = agriculteurSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Aucune valeur fournie pour la mise a jour'
})
