SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'User'
  AND column_name IN ('email', 'phone')
ORDER BY column_name;

SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = '"User"'::regclass
  AND contype = 'u'
  AND conname IN ('User_email_key', 'User_phone_key')
ORDER BY conname;

