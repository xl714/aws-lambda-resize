# MEMORY.md

## But / Cible fonctionnelle

## Repertoires

## Etat global deja en place / Travail deja fait 

### Points importants

### Fichiers rmr-ui-ts principaux

## Commandes utiles

## Demarrage recommande pour la prochaine session



## Previous existing TODO.md replace by .llm dir/files

### Cible retenue

Architecture V1 retenue :

- `1` bucket S3 partagé en `us-east-1`
- préfixes par site sous `medias/<site_code>/images/...`
- `3` distributions CloudFront, une par site
- `2` fonctions Lambda@Edge partagées :
  - `viewer-request`
  - `origin-response`
- `1` rôle IAM d'exécution Lambda@Edge
- `OAC` entre CloudFront et S3
- déploiement en `IaC` via `AWS CDK`

Pourquoi ce choix :

- plus simple que 3 buckets
- plus lisible que 1 seule distribution CloudFront multi-sites
- compatible avec la logique actuelle du projet
- reproductible et maintenable

### Contraintes AWS à garder en tête

- Lambda@Edge doit être créé en `us-east-1`
- les associations CloudFront doivent pointer sur une **version publiée** Lambda, pas `$LATEST`
- le certificat ACM utilisé par CloudFront doit être en `us-east-1`
- CloudFront doit accéder au bucket S3 via `OAC`

### Décisions de design déjà prises

- audience principale : US
- région principale : `us-east-1`
- domaines WordPress actuels :
  - `www.idoldistrict.com`
  - `www.modeldistrict.org`
  - `www.pawmania.fun`
- arborescence S3 :

```text
medias/site-a/images/...
medias/site-b/images/...
medias/site-c/images/...
```

- pas de structure legacy `var/<site>/storage/images/...`
- les 2 lambdas sont mutualisées entre les 3 sites
- WordPress multisite et hébergement principal chez Infomaniak
- recommandation V1 :
  - garder WordPress/HTML/PHP chez Infomaniak
  - servir uniquement les médias via AWS
  - utiliser des sous-domaines dédiés :
    - `media.idoldistrict.com`
    - `media.modeldistrict.org`
    - `media.pawmania.fun`
- la lambda détermine `site_code` depuis le chemin `medias/<site_code>/images/...`
- aucun support runtime ne sera conservé pour l'ancien schéma `var/<site>/storage/images/...`

### Avancement déjà fait dans le repo

- [x] création d'un fichier d'alias pilote `idoldistrict`
- [x] renommage du placeholder `conf-aliases-new-site.tld.js` en `conf-aliases-idoldistrict.js`
- [x] alignement du runtime `origin-response` local + lambda sur `medias/<site_code>/images/...`
- [x] suppression du support runtime legacy `var/<site>/storage/images/...`
- [x] détection de `site_code` depuis le chemin et non depuis le host
- [x] correction du `ENV` hardcodé dans `origin-response`
- [x] résolution du bucket depuis l'origine CloudFront S3 avec fallback local `BUCKET_NAME`
- [x] alignement des mocks, exemples et docs locales sur `idoldistrict`
- [ ] validation fonctionnelle end-to-end avec un vrai original `idoldistrict`
- [ ] bootstrap IaC CDK

### Plan global

#### Phase 1. Cadrage

- [ ] figer les 3 sites et leurs identifiants techniques
- [ ] figer les domaines publics exacts
- [x] choisir le nom du bucket S3 : `gg-shared-use1-7f3c9d`
- [ ] choisir la convention de nommage des stacks et ressources
- [ ] choisir la structure CDK
- [ ] décider si Route53 est géré dans le même projet IaC ou non

### Phase 2. Squelette IaC

- [ ] initialiser un projet CDK
- [ ] choisir le langage du CDK
- [ ] créer un fichier de configuration des sites
- [ ] créer une stack de base `us-east-1`
- [ ] préparer la séparation éventuelle entre :
  - stack bucket/shared
  - stack lambdas edge
  - stack cloudfront per-site

#### Phase 3. Bucket S3 partagé

- [x] créer le bucket S3 en `us-east-1` : `gg-shared-use1-7f3c9d`
- [ ] activer versioning (décision actuelle : laisser désactivé, les originaux restent aussi sur l'hébergeur principal)
- [x] activer chiffrement par défaut : `SSE-S3`
- [x] bloquer l'accès public direct
- [ ] préparer lifecycle rules si besoin plus tard
- [ ] préparer éventuellement CORS si un besoin apparaît
- [ ] définir clairement les préfixes par site

#### Phase 4. Fonctions Lambda@Edge

- [ ] stabiliser le code `viewer-request`
- [ ] stabiliser le code `origin-response`
- [ ] valider localement le flux complet sur un vrai original `idoldistrict`
- [ ] valider le flux AWS réel CloudFront -> S3 -> Lambda@Edge
- [x] définir comment la lambda détermine `site_code` :
  - depuis `medias/<site_code>/images/...`
  - pas depuis le host
- [x] supprimer le support runtime legacy `var/<site>/storage/images/...`
- [x] aligner les mocks, exemples et docs locales sur `idoldistrict`
- [ ] packager les lambdas pour déploiement CDK
- [ ] créer les fonctions en `us-east-1`
- [ ] publier des versions utilisables par CloudFront

#### Phase 5. IAM

- [ ] créer le rôle d'exécution Lambda@Edge
- [ ] donner uniquement les droits S3 nécessaires :
  - `GetObject`
  - `PutObject`
  - éventuellement `ListBucket` si réellement nécessaire
- [ ] donner les droits CloudWatch Logs nécessaires
- [ ] éviter les permissions trop larges sur tout le compte

#### Phase 6. Certificats

- [ ] créer ou importer les certificats ACM pour les 3 domaines
- [ ] vérifier qu'ils sont bien en `us-east-1`
- [ ] préparer les validations DNS

#### Phase 7. Distributions CloudFront

- [ ] créer `1` distribution par site
- [ ] associer chaque distribution à son domaine
- [ ] associer le certificat ACM correspondant
- [ ] connecter chaque distribution au bucket S3 partagé
- [ ] utiliser un `OriginPath` ou une logique lambda selon la stratégie retenue
- [ ] configurer les cache behaviors
- [ ] associer les Lambdas@Edge sur les bons events :
  - `viewer-request`
  - `origin-response`
- [ ] activer compression
- [ ] activer logs si souhaité
- [ ] fixer une politique de cache cohérente

#### Phase 8. OAC et policy S3

- [ ] créer l'OAC CloudFront
- [ ] écrire la bucket policy qui autorise CloudFront
- [ ] refuser l'accès public direct au bucket
- [ ] valider qu'on ne peut lire les objets que via CloudFront

#### Phase 9. DNS

- [ ] créer les enregistrements DNS pour les 3 sites
- [ ] pointer chaque domaine vers sa distribution CloudFront
- [ ] gérer apex + www si besoin

#### Phase 10. Observabilité

- [ ] activer logs CloudFront si utile
- [ ] valider les logs CloudWatch pour les lambdas
- [ ] définir quelques métriques de base :
  - erreurs Lambda
  - 4xx/5xx CloudFront
  - volume de requêtes

#### Phase 11. Déploiement initial

- [ ] déployer bucket + IAM + lambdas
- [ ] publier les versions Lambda@Edge
- [ ] déployer les distributions CloudFront
- [ ] valider les certificats
- [ ] brancher le DNS

#### Phase 12. Recette

- [ ] tester un original existant
- [ ] tester une génération `jpeg`
- [ ] tester une génération `webp`
- [ ] tester une génération `avif`
- [ ] tester un miss S3 puis un hit cache
- [ ] tester les 3 sites
- [ ] tester les bons chemins `medias/<site_code>/images/...`

#### Phase 13. Durcissement

- [x] corriger le `ENV` hardcodé dans `origin-response`
- [ ] finir de réduire la dérive entre local et Lambda
- [ ] ajouter de vrais tests automatisés
- [ ] documenter le runbook de déploiement
- [ ] documenter la publication de nouvelles versions Lambda@Edge
- [ ] nettoyer les derniers commentaires / exemples historiques non utiles

### Ordre recommandé

Ordre de travail conseillé :

1. validation fonctionnelle `idoldistrict`
2. cadrage infra minimal
3. squelette CDK
4. bucket S3
5. IAM
6. packaging lambda
7. certificats ACM
8. distributions CloudFront
9. DNS
10. recette

### Détails attendus pour l'étape 1

Pour commencer, il faut d'abord figer ces informations :

#### Sites

- [ ] nom métier du site 1
- [ ] nom métier du site 2
- [ ] nom métier du site 3
- [ ] `site_code` de chaque site

Exemple :

```text
site-a
site-b
site-c
```

Proposition concrète :

```text
idoldistrict
modeldistrict
pawmania
```

#### Domaines

- [ ] domaine principal de chaque site
- [ ] variante `www` ou non
- [ ] zone DNS gérée dans Route53 ou ailleurs

Exemple :

```text
site-a.com
www.site-a.com
site-b.com
site-c.com
```

État actuel :

```text
www.idoldistrict.com
www.modeldistrict.org
www.pawmania.fun
```

Proposition média :

```text
media.idoldistrict.com
media.modeldistrict.org
media.pawmania.fun
```

#### Nommage AWS

- [x] nom du bucket partagé
- [ ] préfixe global des stacks
- [ ] convention de nommage des distributions et fonctions

Exemple :

```text
Bucket: us-media-main
Stack prefix: media-edge
Functions: media-edge-viewer-request / media-edge-origin-response
```

Proposition concrète :

```text
Bucket: gg-shared-use1-7f3c9d
Stack prefix: media-edge
Functions: media-edge-viewer-request / media-edge-origin-response
```

Décision prise le `2026-03-20` pour le bucket partagé actuel :

- nom : `gg-shared-use1-7f3c9d`
- région : `us-east-1`
- namespace : global
- bucket privé
- `Object Ownership` : `Bucket owner enforced` / ACLs désactivées
- `Block Public Access` : activé
- chiffrement par défaut : `SSE-S3`
- versioning : désactivé par choix pragmatique

#### Outil IaC

- [ ] CDK confirmé
- [ ] langage CDK confirmé

Recommandation :

- `AWS CDK`
- `TypeScript`

Pourquoi :

- bon équilibre entre lisibilité et puissance
- meilleure ergonomie que CloudFormation brut pour Lambda@Edge
- facile à relire et maintenir

### Première implémentation recommandée

V1 simple :

- `1` app CDK
- `1` stack shared :
  - bucket
  - rôle IAM
  - lambdas edge
- `3` stacks site :
  - certificat
  - distribution CloudFront
  - DNS éventuel

Projection concrète :

- shared stack :
  - bucket partagé
  - rôle IAM
  - lambdas edge
- site stack `idoldistrict`
  - certificat pour `media.idoldistrict.com`
  - distribution CloudFront
- site stack `modeldistrict`
  - certificat pour `media.modeldistrict.org`
  - distribution CloudFront
- site stack `pawmania`
  - certificat pour `media.pawmania.fun`
  - distribution CloudFront

### Ce qu'il faudra probablement décider ensuite

- garder `1` paire de lambdas partagée ou passer à `1` paire par site
- gérer Route53 dans le même repo ou non
- activer Origin Shield ou non
- gérer les logs CloudFront dès le départ ou dans un second temps

### Prochaine action

Priorité immédiate : **valider le site pilote `idoldistrict`** maintenant que le runtime ne supporte plus que `medias/<site_code>/images/...`.

#### Sprint court recommandé

1. Validation locale `idoldistrict`

- uploader un vrai original sous `medias/idoldistrict/images/test-images/idoldistrict-sample.jpg` dans `gg-shared-use1-7f3c9d`
- configurer `local-env/express-app/src/aws.credentials.json` ou la config AWS locale
- exporter `BUCKET_NAME=gg-shared-use1-7f3c9d`
- pointer un mock `origin-response` local vers cette clé S3 réelle
- lancer `npm start`
- vérifier `viewer-request` puis `origin-response` sur `jpeg`, `webp` et `avif`

2. Cadrage infra minimal avant CDK

- bucket partagé déjà créé : `gg-shared-use1-7f3c9d`
- confirmer les 3 domaines média
- décider si Route53 est géré dans ce repo ou non

3. Bootstrap IaC

- initialiser `AWS CDK`
- confirmer `TypeScript`
- créer un fichier de configuration des sites
- préparer `1` stack shared + `3` stacks site

4. Packaging / déploiement Lambda@Edge

- zip de la fonction `origin-response`
- publication de version
- future association CloudFront sur version publiée

Livrable cadrage minimal avant CDK :

- un petit tableau avec :
  - `site_name`
  - `site_code`
  - `domain`
  - `aliases DNS`
  - `S3 prefix`
  - `certificate needed`
  - `Route53 hosted zone yes/no`

Pré-remplissage recommandé :

```text
site_name: idoldistrict
site_code: idoldistrict
domain: www.idoldistrict.com
aliases DNS: media.idoldistrict.com
S3 prefix: medias/idoldistrict/images/
certificate needed: media.idoldistrict.com
Route53 hosted zone yes/no: unknown

site_name: modeldistrict
site_code: modeldistrict
domain: www.modeldistrict.org
aliases DNS: media.modeldistrict.org
S3 prefix: medias/modeldistrict/images/
certificate needed: media.modeldistrict.org
Route53 hosted zone yes/no: unknown

site_name: pawmania
site_code: pawmania
domain: www.pawmania.fun
aliases DNS: media.pawmania.fun
S3 prefix: medias/pawmania/images/
certificate needed: media.pawmania.fun
Route53 hosted zone yes/no: unknown
```
