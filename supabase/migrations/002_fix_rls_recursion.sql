-- Fix infinite recursion in workspace_members RLS policies
-- Run this in Supabase SQL Editor

-- Drop the problematic policies
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners/admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view all workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can update members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can delete members" ON workspace_members;

-- Create fixed policies that don't cause recursion
-- For SELECT: Users can see their own memberships OR if they own the workspace
CREATE POLICY "Users can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
  );

-- For INSERT: Only workspace owners can add members (uses workspaces table, no recursion)
CREATE POLICY "Owners can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
  );

-- For UPDATE: Only workspace owners can update member roles
CREATE POLICY "Owners can update members"
  ON workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
  );

-- For DELETE: Only workspace owners can remove members (but not themselves)
CREATE POLICY "Owners can delete members"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND w.owner_id = auth.uid()
    )
    AND user_id != auth.uid()  -- Can't remove yourself
  );
