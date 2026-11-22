import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { MembersApp } from './members/MembersApp';
import t from './content/pt-BR.json';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <MembersApp t={t} />
  </StrictMode>
);
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
