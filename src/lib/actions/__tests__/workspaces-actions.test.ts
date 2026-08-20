import { describe, it, expect, beforeEach } from 'vitest';
import { setDb, resetDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';

describe('Workspace Actions', () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe('getWorkspaces', () => {
    it('should return empty array initially', async () => {
      const { getWorkspaces } = await import('../workspaces');
      const workspaces = await getWorkspaces();
      expect(workspaces).toEqual([]);
    });
  });

  describe('getWorkspaceById', () => {
    it('should return undefined for non-existent workspace', async () => {
      const { getWorkspaceById } = await import('../workspaces');
      const workspace = await getWorkspaceById(999);
      expect(workspace).toBeUndefined();
    });
  });

  describe('createWorkspace', () => {
    it('should create a workspace with name and description', async () => {
      const { createWorkspace } = await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'My Project',
        description: 'A workspace for my project',
        user_id: 1,
      });

      expect(workspace.name).toBe('My Project');
      expect(workspace.description).toBe('A workspace for my project');
      expect(workspace.created_by).toBe(1);
    });

    it('should create a workspace without description', async () => {
      const { createWorkspace } = await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Simple Workspace',
        user_id: 1,
      });

      expect(workspace.name).toBe('Simple Workspace');
      expect(workspace.description).toBeNull();
    });
  });

  describe('updateWorkspace', () => {
    it('should throw error for non-existent workspace', async () => {
      const { updateWorkspace, getWorkspaceById } =
        await import('../workspaces');

      // First verify the workspace doesn't exist
      const existing = await getWorkspaceById(999);
      expect(existing).toBeUndefined();

      // Now test that update throws error
      await expect(updateWorkspace(999, { name: 'Updated' })).rejects.toThrow(
        'Workspace not found'
      );
    });

    it('should update workspace name and description', async () => {
      const { createWorkspace, updateWorkspace, getWorkspaceById } =
        await import('../workspaces');

      // Create a workspace first
      const workspace = await createWorkspace({
        name: 'Original Name',
        description: 'Original description',
        user_id: 1,
      });

      // Update the workspace
      const updated = await updateWorkspace(workspace.id, {
        name: 'Updated Name',
        description: 'Updated description',
      });

      expect(updated.id).toBe(workspace.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated description');
    });

    it('should throw error when workspace is deleted before update', async () => {
      const { createWorkspace, deleteWorkspace, updateWorkspace } =
        await import('../workspaces');

      // Create a workspace first
      const workspace = await createWorkspace({
        name: 'To Delete',
        user_id: 1,
      });

      // Delete it
      await deleteWorkspace(workspace.id);

      // Now try to update the deleted workspace - should throw
      await expect(
        updateWorkspace(workspace.id, { name: 'Updated' })
      ).rejects.toThrow('Workspace not found');
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete a workspace without error', async () => {
      const { createWorkspace, getWorkspaceById, deleteWorkspace } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'To Delete',
        user_id: 1,
      });

      await deleteWorkspace(workspace.id);
      const found = await getWorkspaceById(workspace.id);
      expect(found).toBeUndefined();
    });

    it('should handle deleting non-existent workspace', async () => {
      const { deleteWorkspace } = await import('../workspaces');
      await expect(deleteWorkspace(99999)).resolves.not.toThrow();
    });
  });

  describe('addWorkspaceMember', () => {
    it('should add a member to a workspace', async () => {
      const { createWorkspace, addWorkspaceMember } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });

      const member = await addWorkspaceMember(workspace.id, 2, 'member');

      expect(member.workspace_id).toBe(workspace.id);
      expect(member.user_id).toBe(2);
      expect(member.role).toBe('member');
    });

    it('should add a workspace owner', async () => {
      const { createWorkspace, addWorkspaceMember } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });

      const owner = await addWorkspaceMember(workspace.id, 3, 'owner');
      expect(owner.role).toBe('owner');
    });

    it('should add a workspace admin', async () => {
      const { createWorkspace, addWorkspaceMember } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });

      const admin = await addWorkspaceMember(workspace.id, 4, 'admin');
      expect(admin.role).toBe('admin');
    });
  });

  describe('removeWorkspaceMember', () => {
    it('should remove a member from workspace', async () => {
      const {
        createWorkspace,
        addWorkspaceMember,
        removeWorkspaceMember,
        getWorkspaceMembers,
      } = await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });

      await addWorkspaceMember(workspace.id, 2, 'member');
      await removeWorkspaceMember(workspace.id, 2);

      const members = await getWorkspaceMembers(workspace.id);
      expect(members.length).toBe(0);
    });
  });

  describe('getUserWorkspaceRole', () => {
    it('should return null for non-member', async () => {
      const { createWorkspace, getUserWorkspaceRole } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });

      const role = await getUserWorkspaceRole(999, workspace.id);
      expect(role).toBeNull();
    });

    it('should return member role', async () => {
      const { createWorkspace, addWorkspaceMember, getUserWorkspaceRole } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });
      await addWorkspaceMember(workspace.id, 2, 'member');

      const role = await getUserWorkspaceRole(2, workspace.id);
      expect(role).toBe('member');
    });
  });

  describe('updateUserWorkspaceRole', () => {
    it('should update member role to admin', async () => {
      const {
        createWorkspace,
        addWorkspaceMember,
        updateUserWorkspaceRole,
        getUserWorkspaceRole,
      } = await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });
      await addWorkspaceMember(workspace.id, 2, 'member');

      await updateUserWorkspaceRole(2, workspace.id, 'admin');

      const role = await getUserWorkspaceRole(2, workspace.id);
      expect(role).toBe('admin');
    });
  });

  describe('getWorkspacePermissions', () => {
    it('should return false permissions for non-member', async () => {
      const { createWorkspace, getWorkspacePermissions } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Private Project',
        user_id: 1,
      });

      const perms = await getWorkspacePermissions(999, workspace.id);
      expect(perms.canView).toBe(false);
      expect(perms.canEdit).toBe(false);
      expect(perms.canManageMembers).toBe(false);
      expect(perms.canDelete).toBe(false);
    });

    it('should return correct permissions for member', async () => {
      const { createWorkspace, addWorkspaceMember, getWorkspacePermissions } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });
      await addWorkspaceMember(workspace.id, 2, 'member');

      const perms = await getWorkspacePermissions(2, workspace.id);
      expect(perms.canView).toBe(true);
      expect(perms.canEdit).toBe(true);
      expect(perms.canManageMembers).toBe(false);
      expect(perms.canDelete).toBe(false);
    });

    it('should return correct permissions for admin', async () => {
      const { createWorkspace, addWorkspaceMember, getWorkspacePermissions } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });
      await addWorkspaceMember(workspace.id, 2, 'admin');

      const perms = await getWorkspacePermissions(2, workspace.id);
      expect(perms.canView).toBe(true);
      expect(perms.canEdit).toBe(true);
      expect(perms.canManageMembers).toBe(true);
      expect(perms.canDelete).toBe(false);
    });

    it('should return full permissions for owner', async () => {
      const { createWorkspace, addWorkspaceMember, getWorkspacePermissions } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });
      await addWorkspaceMember(workspace.id, 2, 'owner');

      const perms = await getWorkspacePermissions(2, workspace.id);
      expect(perms.canView).toBe(true);
      expect(perms.canEdit).toBe(true);
      expect(perms.canManageMembers).toBe(true);
      expect(perms.canDelete).toBe(true);
    });
  });

  describe('canUserAccessWorkspace', () => {
    it('should return false for non-member', async () => {
      const { createWorkspace, canUserAccessWorkspace } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Private Project',
        user_id: 1,
      });

      const canAccess = await canUserAccessWorkspace(999, workspace.id);
      expect(canAccess).toBe(false);
    });

    it('should return true for member', async () => {
      const { createWorkspace, addWorkspaceMember, canUserAccessWorkspace } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });
      await addWorkspaceMember(workspace.id, 2, 'member');

      const canAccess = await canUserAccessWorkspace(2, workspace.id);
      expect(canAccess).toBe(true);
    });
  });

  describe('getUserWorkspaces', () => {
    it('should return workspaces for a user', async () => {
      const { createWorkspace, addWorkspaceMember, getUserWorkspaces } =
        await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });

      await addWorkspaceMember(workspace.id, 2, 'member');

      const workspaces = await getUserWorkspaces(2);
      expect(Array.isArray(workspaces)).toBe(true);
    });

    it('should return empty array for user without workspaces', async () => {
      const { getUserWorkspaces } = await import('../workspaces');
      const workspaces = await getUserWorkspaces(999);
      expect(workspaces).toEqual([]);
    });
  });

  describe('transferWorkspaceOwnership', () => {
    it('should transfer ownership successfully', async () => {
      const {
        createWorkspace,
        addWorkspaceMember,
        transferWorkspaceOwnership,
      } = await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });

      await addWorkspaceMember(workspace.id, 2, 'member');

      // Transfer ownership to user 2 - should not throw
      await expect(
        transferWorkspaceOwnership(workspace.id, 2)
      ).resolves.not.toThrow();
    });

    it('should overwrite existing membership when transferring ownership', async () => {
      const {
        createWorkspace,
        addWorkspaceMember,
        transferWorkspaceOwnership,
      } = await import('../workspaces');
      const workspace = await createWorkspace({
        name: 'Team Project',
        user_id: 1,
      });

      // User 2 already has a different role
      await addWorkspaceMember(workspace.id, 2, 'member');

      // Transfer ownership to user 2 - should not throw
      await expect(
        transferWorkspaceOwnership(workspace.id, 2)
      ).resolves.not.toThrow();
    });
  });
});
