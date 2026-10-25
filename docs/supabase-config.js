/* Connexion au forum (Supabase).
   Colle ici les 2 valeurs de ton projet Supabase : Project Settings > API (ou « Connect »).
   - URL : « Project URL », du style https://abcdefgh.supabase.co
   - CLE : la clé « publishable » (sb_publishable_...) ou « anon public » (eyJ...).
   Ces deux valeurs sont PUBLIQUES, c'est normal de les mettre ici : la sécurité est assurée
   par les règles de supabase/forum.sql. Ne mets JAMAIS ici la clé « secret » ou « service_role ».
   Tant que c'est vide, le forum affiche « bientôt disponible ». */
var SUPABASE = {
  URL: 'https://updqdvsigqtsjddeshvi.supabase.co',
  CLE: 'sb_publishable_wvxRoVPpFIvPPrB9GTqsLQ_Q8LUArgH'
};
