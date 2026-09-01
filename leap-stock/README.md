# Stock filaments — LEAP

App de gestion du stock de filaments 3D : bobines, utilisation par membre/impression, mise à
jour du stock en temps réel pour tout le monde.

Stack : React + Vite (frontend), Supabase (base de données Postgres + synchro temps réel, gratuit),
Vercel (hébergement gratuit).

## 1. Créer la base de données (Supabase)

1. Va sur https://supabase.com et crée un compte gratuit (avec GitHub par exemple).
2. Crée un nouveau projet (choisis une région proche, ex. Europe/Paris). Note le mot de passe
   généré pour la base — tu n'en auras normalement pas besoin ensuite.
3. Une fois le projet créé, va dans **SQL Editor** (menu de gauche) > **New query**.
4. Colle tout le contenu du fichier `supabase-schema.sql` (à la racine de ce projet) et clique
   sur **Run**. Ça crée les deux tables (`bobines`, `usages`) et active la synchro temps réel.
5. Va dans **Project Settings > API**. Note deux valeurs :
   - **Project URL** (ex. `https://xxxxx.supabase.co`)
   - **anon public key** (une longue chaîne de caractères)

Ce sont les deux seules infos dont l'app a besoin — pas de mot de passe, pas de clé secrète.

## 2. Mettre le code sur GitHub

1. Crée un compte GitHub si tu n'en as pas : https://github.com
2. Crée un nouveau dépôt (repo) vide, par exemple `leap-stock-filaments`.
3. Depuis ce dossier, sur ton ordi :
   ```
   git init
   git add .
   git commit -m "Première version"
   git branch -M main
   git remote add origin https://github.com/TON-COMPTE/leap-stock-filaments.git
   git push -u origin main
   ```

## 3. Déployer (Vercel, gratuit)

1. Va sur https://vercel.com et connecte-toi avec ton compte GitHub.
2. Clique **Add New > Project**, choisis le dépôt `leap-stock-filaments`.
3. Vercel détecte automatiquement Vite — ne change rien aux réglages de build.
4. Avant de cliquer sur **Deploy**, ouvre la section **Environment Variables** et ajoute :
   - `VITE_SUPABASE_URL` → l'URL notée à l'étape 1
   - `VITE_SUPABASE_ANON_KEY` → la clé anon notée à l'étape 1
5. Clique **Deploy**. Au bout d'une minute, Vercel te donne une URL du type
   `leap-stock-filaments.vercel.app` — c'est votre site, accessible par tous les membres,
   depuis n'importe quel navigateur.

Chaque fois que tu pousses du code sur GitHub (`git push`), Vercel redéploie automatiquement.

## 4. Utilisation quotidienne

- Onglet **Stock** : voir toutes les bobines, en ajouter, corriger un poids après inventaire.
- Onglet **Déclarer une utilisation** : choisir une bobine, indiquer qui imprime quoi et
  combien de grammes — le stock se déduit automatiquement.
- Onglet **Historique** : tout l'historique des impressions, filtrable par membre.

Les mises à jour sont **en temps réel** : si quelqu'un déclare une utilisation sur un poste,
ça se met à jour instantanément sur tous les autres postes ouverts sur le site.

## Limites actuelles (à savoir)

- **Pas de comptes membres** : n'importe qui avec le lien peut modifier le stock. Pour une
  asso interne c'est en général suffisant, mais ça peut être ajouté plus tard avec
  Supabase Auth si besoin (login par email de l'école, par exemple).
- Free tier Supabase : projet mis en pause après 1 semaine d'inactivité totale (se réactive
  tout seul au premier accès, il faut juste patienter quelques secondes).
- Free tier Vercel : largement suffisant pour un usage asso (pas de limite réaliste ici).

## Développement local

```
npm install
cp .env.example .env   # puis colle tes vraies valeurs Supabase dans .env
npm run dev
```
