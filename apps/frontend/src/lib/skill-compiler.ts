import { db } from '@/lib/db'
import type { Skill } from '@prisma/client'
import fs from 'fs'
import path from 'path'

export type RuntimeSkill = Skill & {
  markdownContent: string
}

export async function compileSkill(skill: Skill): Promise<RuntimeSkill> {
  let markdownContent = skill.skillMdContent || ''

  if (!markdownContent && skill.skillMdPath) {
    try {
      const fullPath = path.resolve(process.cwd(), skill.skillMdPath)
      if (fs.existsSync(fullPath)) {
        markdownContent = fs.readFileSync(fullPath, 'utf8')
      }
    } catch (e) {
      console.error(`Failed to load SKILL.md from ${skill.skillMdPath}`, e)
    }
  }

  return {
    ...skill,
    markdownContent
  }
}

export function validateSkillPermissions(skill: RuntimeSkill, agentSkills: string): boolean {
  if (!skill.requiredPerms) return true
  
  const required = skill.requiredPerms.split(',').map(s => s.trim()).filter(Boolean)
  const agentPerms = agentSkills.split(',').map(s => s.trim()).filter(Boolean)
  
  return required.every(req => agentPerms.includes(req))
}

export function validateSkillDependencies(skill: RuntimeSkill, availableSkills: string[]): boolean {
  if (!skill.dependencies) return true
  
  const deps = skill.dependencies.split(',').map(s => s.trim()).filter(Boolean)
  return deps.every(dep => availableSkills.includes(dep))
}
