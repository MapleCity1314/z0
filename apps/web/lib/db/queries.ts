import { eq } from "drizzle-orm";
import { getDb, user, type User } from "@z0/db";
export {
  createArtifact,
  createChat,
  deleteChat,
  getArtifactByIndex,
  getArtifactsByChatId,
  getChatById,
  getChatsByUserId,
  getMessagesByChatId,
  getNextArtifactIndex,
  saveAgentRun,
  saveMessages,
  saveToolCalls,
  updateArtifactCode,
  updateChatProjectId,
} from "@z0/backend";

const db = getDb();

export async function getUserById(id: string): Promise<User | null> {
  const [result] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return result || null;
}
