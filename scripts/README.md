# scripts/ — utilitários administrativos (Node + Firebase Admin)

Scripts de seed/administração que rodam fora do app, com o **Firebase Admin SDK**.
Cada um requer um `service-account.json` na **raiz do projeto** (gitignored).

| Script                  | npm                     | O que faz |
| ----------------------- | ----------------------- | --------- |
| `seed.js`               | `npm run seed`          | Popula products, rewards, invites e usuários admin |
| `seed-rest.js`          | `npm run seed:rest`     | Seed alternativo via REST API (sem Admin SDK) |
| `create-users.js`       | `npm run create-users`  | Cria admin + agentes de teste |
| `create-ingredients.js` | `node scripts/create-ingredients.js` | Ingredientes do Monte Seu Lanche |
| `create-missions.js`    | `node scripts/create-missions.js`    | Missões |
| `create-rewards.js`     | `node scripts/create-rewards.js`     | Recompensas |
| `migrate-invites.js`    | `node scripts/migrate-invites.js`    | Migração de convites (formato antigo) |
| `fix-admin.js`          | `node scripts/fix-admin.js`          | Correção pontual do perfil admin |

> ⚠️ Precisam do `service-account.json` (chave privada do Firebase) na raiz.
> Nunca commite esse arquivo — ele está no `.gitignore`.
