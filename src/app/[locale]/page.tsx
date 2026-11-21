import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('common');

  return (
    <main>
      <h1>{t('scaffoldingOk')}</h1>
      <p>LMS SaaS — Phase 0 scaffold</p>
    </main>
  );
}
