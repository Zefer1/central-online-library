import React from 'react';
import Header from "../../components/Header/Header";
import { PageTitle } from '../../components/PageTitle/PageTitle';
import "./index.scss";

const Home = () => {
  return (
    <div className='home'>
      <Header/>
      <div className="page">
        <PageTitle
          title="Biblioteca Central Online"
          subtitle="Use o menu para navegar pelo catálogo."
        />
      </div>
    </div>
  )
}

export default Home