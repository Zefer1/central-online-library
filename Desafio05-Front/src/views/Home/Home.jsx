import Header from "../../components/Header/Header";
import { PageTitle } from '../../components/PageTitle/PageTitle';
import { useTranslation } from '../../i18n/useTranslation';
import "./index.scss";

const Home = () => {
  const { t } = useTranslation();
  return (
    <div className='home'>
      <Header/>
      <div className="page">
        <PageTitle
          title={t('home.title')}
          subtitle={t('home.subtitle')}
        />
      </div>
    </div>
  )
}

export default Home