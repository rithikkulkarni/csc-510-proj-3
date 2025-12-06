import HeaderClient from './HeaderClient';
import { server } from '@/stack/server';
import { ensureUserInDB, getUserDetails } from '@/app/actions';

export default async function HeaderServer() {
    let serverUser = null;

    try {
        // Get current authenticated Neon user (server)
        const neonUser = await server.getUser();

        if (neonUser) {
            // Ensure user exists in DB
            serverUser = await ensureUserInDB({
                id: neonUser.id,
                displayName: neonUser.displayName ?? 'User',
            });

            // Optionally preload full profile
            if (serverUser) {
                serverUser = await getUserDetails(neonUser.id);
            }
        }
    } catch (err) {
        console.error('HeaderServer: Failed to load user', err);
    }

    // Pass serverUser to client
    return <HeaderClient serverUser={serverUser} />;
}
