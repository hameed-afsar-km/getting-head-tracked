/**
 * Root page — renders the immersive 3D experience.
 * All heavy lifting is in the ImmersiveExperience client component.
 */

import { ImmersiveExperience } from '@/components/ImmersiveExperience';

export default function HomePage() {
  return (
    <main>
      <ImmersiveExperience />
    </main>
  );
}
