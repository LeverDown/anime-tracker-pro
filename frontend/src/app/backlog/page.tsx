import { BacklogClient } from './BacklogClient';
import { BacklogPageHeader } from './BacklogPageHeader';
import { HUDFooter } from './HUDFooter';

export default async function BacklogPage() {
  // Server-side logic could go here (e.g. auth check)
  
  return (
    <>
      <BacklogPageHeader />
      <BacklogClient />
      <HUDFooter section="BACKLOG" />
    </>
  );
}
