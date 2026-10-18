import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft } from 'lucide-react'
import Layout from '../site/Layout.jsx'
import { useI18n } from '../i18n/I18nProvider.jsx'

export default function NotFound({ title, text }) {
  const { t } = useI18n()
  const heading = title || t('notFound.title')
  return (
    <Layout>
      <Helmet>
        <title>{`${heading} — Berat Emek`}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="wrap narrow not-found">
        <p className="kicker">404</p>
        <h1>{heading}</h1>
        <p>{text || t('notFound.text')}</p>
        <Link to="/" className="s-btn ghost">
          <ArrowLeft size={16} /> {t('notFound.home')}
        </Link>
      </div>
    </Layout>
  )
}
