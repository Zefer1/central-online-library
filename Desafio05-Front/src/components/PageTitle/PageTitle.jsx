import './index.scss';

export function PageTitle({ title, subtitle }) {
  return (
    <header className="page-title">
      <h1 className="page-title__title">{title}</h1>
      {subtitle ? <p className="page-title__subtitle">{subtitle}</p> : null}
    </header>
  );
}
