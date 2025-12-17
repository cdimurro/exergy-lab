import { z } from 'zod'
import {
  ToolDeclaration,
  ToolResult,
  ToolCall,
  ToolName,
  FunctionDeclaration,
  ParameterSchema,
  ToolExecutionError,
} from '@/types/agent'
import { executeResilient } from '../error-recovery'

// ============================================================================
// Tool Registry Class
// ============================================================================

export class ToolRegistry {
  private tools: Map<ToolName, ToolDeclaration> = new Map()
  private executionHistory: Map<string, ToolResult> = new Map()

  constructor() {
    // Initialize empty registry
  }

  /**
   * Register a new tool
   */
  register(tool: ToolDeclaration): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Tool "${tool.name}" is already registered. Overwriting...`)
    }

    this.tools.set(tool.name, tool)
    console.log(`[ToolRegistry] Registered tool: ${tool.name}`)
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: ToolDeclaration[]): void {
    tools.forEach((tool) => this.register(tool))
  }

  /**
   * Get a tool by name
   */
  get(toolName: ToolName): ToolDeclaration | undefined {
    return this.tools.get(toolName)
  }

  /**
   * Check if a tool exists
   */
  has(toolName: ToolName): boolean {
    return this.tools.has(toolName)
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): ToolName[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolDeclaration[] {
    return Array.from(this.tools.values())
  }

  /**
   * Validate tool parameters against schema
   */
  validate(toolName: ToolName, params: any): { valid: boolean; error?: string } {
    const tool = this.tools.get(toolName)

    if (!tool) {
      return {
        valid: false,
        error: `Tool "${toolName}" is not registered`,
      }
    }

    try {
      tool.schema.parse(params)
      return { valid: true }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ')
        return {
          valid: false,
          error: `Validation failed: ${errorMessages}`,
        }
      }

      return {
        valid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  /**
   * Execute a tool with resilient error handling
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const { toolName, params, callId } = toolCall
    const startTime = Date.now()

    // Check if tool exists
    const tool = this.tools.get(toolName)
    if (!tool) {
      const error = `Tool "${toolName}" is not registered`
      console.error(`[ToolRegistry] ${error}`)

      const result: ToolResult = {
        success: false,
        error,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      }

      this.executionHistory.set(callId, result)
      return result
    }

    // Validate parameters
    const validation = this.validate(toolName, params)
    if (!validation.valid) {
      console.error(`[ToolRegistry] === Validation Failed ===`)
      console.error(`[ToolRegistry] Tool: ${toolName}`)
      console.error(`[ToolRegistry] Params received:`, JSON.stringify(params, null, 2))
      console.error(`[ToolRegistry] Param types:`, Object.entries(params || {}).map(([k, v]) => `${k}: ${typeof v}`).join(', '))
      console.error(`[ToolRegistry] Validation error:`, validation.error)

      // Log expected schema for debugging
      const tool = this.tools.get(toolName)
      if (tool) {
        console.error(`[ToolRegistry] Expected schema:`, tool.schema.description || 'See tool definition')
      }

      const result: ToolResult = {
        success: false,
        error: validation.error,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      }

      this.executionHistory.set(callId, result)
      return result
    }

    // Execute tool with resilient error handling
    try {
      console.log(`[ToolRegistry] Executing ${toolName} with params:`, params)

      const data = await executeResilient(
        () => tool.handler(params),
        `tool:${toolName}`
      )

      const result: ToolResult = {
        success: true,
        data,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      }

      console.log(`[ToolRegistry] ${toolName} completed successfully in ${result.duration}ms`)

      this.executionHistory.set(callId, result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[ToolRegistry] ${toolName} failed:`, error)

      const toolError = new ToolExecutionError(
        `Tool execution failed: ${errorMessage}`,
        toolName,
        error as Error
      )

      const result: ToolResult = {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      }

      this.executionHistory.set(callId, result)
      throw toolError
    }
  }

  /**
   * Execute multiple tools in sequence
   */
  async executeSequence(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = []

    for (const toolCall of toolCalls) {
      const result = await this.execute(toolCall)
      results.push(result)

      // Stop if any tool fails
      if (!result.success) {
        console.warn(`[ToolRegistry] Sequence stopped at ${toolCall.toolName} due to failure`)
        break
      }
    }

    return results
  }

  /**
   * Execute multiple tools in parallel (independent calls)
   */
  async executeParallel(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const promises = toolCalls.map((toolCall) => this.execute(toolCall))

    return Promise.all(promises)
  }

  /**
   * Get execution history for a call ID
   */
  getExecutionHistory(callId: string): ToolResult | undefined {
    return this.executionHistory.get(callId)
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory.clear()
  }

  /**
   * Convert tool declarations to Gemini function declarations
   */
  toGeminiFunctionDeclarations(): FunctionDeclaration[] {
    return Array.from(this.tools.values()).map((tool) =>
      this.toolToFunctionDeclaration(tool)
    )
  }

  /**
   * Convert a single tool to Gemini function declaration
   */
  private toolToFunctionDeclaration(tool: ToolDeclaration): FunctionDeclaration {
    // Extract schema properties using Zod
    const schemaShape = this.zodSchemaToParameters(tool.schema)

    return {
      name: tool.name,
      description: tool.description,
      parameters: schemaShape,
    }
  }

  /**
   * Convert Zod schema to Gemini parameter schema
   */
  private zodSchemaToParameters(schema: z.ZodSchema): {
    type: 'object'
    properties: Record<string, ParameterSchema>
    required: string[]
  } {
    // This is a simplified conversion for common cases
    // For complex schemas, you may need to extend this
    const properties: Record<string, ParameterSchema> = {}
    const required: string[] = []

    if (schema instanceof z.ZodObject) {
      // In Zod v4, shape is a property, not a function
      const shape = (schema as any).shape || (schema._def as any).shape

      for (const [key, value] of Object.entries(shape)) {
        const zodField = value as z.ZodTypeAny

        properties[key] = this.zodTypeToParameterSchema(zodField)

        // Check if field is required (not optional) - use safe method
        if (!(zodField as any).isOptional?.() && !(zodField as any)._def?.typeName?.includes('Optional')) {
          required.push(key)
        }
      }
    }

    return {
      type: 'object',
      properties,
      required,
    }
  }

  /**
   * Convert Zod type to parameter schema
   */
  private zodTypeToParameterSchema(zodType: z.ZodTypeAny): ParameterSchema {
    if (zodType instanceof z.ZodString) {
      const enumValues = (zodType as any)._def.checks?.find(
        (check: any) => check.kind === 'enum'
      )?.values

      return {
        type: 'string',
        description: zodType.description || 'String parameter',
        ...(enumValues && { enum: enumValues }),
      }
    }

    if (zodType instanceof z.ZodNumber) {
      return {
        type: 'number',
        description: zodType.description || 'Number parameter',
      }
    }

    if (zodType instanceof z.ZodBoolean) {
      return {
        type: 'boolean',
        description: zodType.description || 'Boolean parameter',
      }
    }

    if (zodType instanceof z.ZodArray) {
      // In Zod v4, element type is accessed via element property or _def.element
      const itemType = (zodType as any).element || (zodType._def as any).element || (zodType._def as any).type
      if (itemType && typeof itemType !== 'string') {
        return {
          type: 'array',
          description: zodType.description || 'Array parameter',
          items: this.zodTypeToParameterSchema(itemType),
        }
      }
      return {
        type: 'array',
        description: zodType.description || 'Array parameter',
      }
    }

    if (zodType instanceof z.ZodObject) {
      // In Zod v4, shape might be a property or a function
      const shape = typeof (zodType._def as any).shape === 'function'
        ? (zodType._def as any).shape()
        : (zodType as any).shape || (zodType._def as any).shape || {}
      const properties: Record<string, ParameterSchema> = {}

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodTypeToParameterSchema(value as z.ZodTypeAny)
      }

      return {
        type: 'object',
        description: zodType.description || 'Object parameter',
        properties,
      }
    }

    // Default fallback
    return {
      type: 'string',
      description: 'Parameter',
    }
  }

  /**
   * Get statistics about the registry
   */
  getStats(): {
    totalTools: number
    toolNames: ToolName[]
    executionCount: number
  } {
    return {
      totalTools: this.tools.size,
      toolNames: this.getToolNames(),
      executionCount: this.executionHistory.size,
    }
  }

  /**
   * Remove a tool from the registry
   */
  unregister(toolName: ToolName): boolean {
    return this.tools.delete(toolName)
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear()
    this.clearHistory()
  }
}

// ============================================================================
// Global Tool Registry Instance
// ============================================================================

let globalToolRegistry: ToolRegistry | null = null

/**
 * Get or create global tool registry
 */
export function getGlobalToolRegistry(): ToolRegistry {
  if (!globalToolRegistry) {
    globalToolRegistry = new ToolRegistry()
  }
  return globalToolRegistry
}

/**
 * Register a tool in the global registry
 */
export function registerGlobalTool(tool: ToolDeclaration): void {
  getGlobalToolRegistry().register(tool)
}

/**
 * Register multiple tools in the global registry
 */
export function registerGlobalTools(tools: ToolDeclaration[]): void {
  getGlobalToolRegistry().registerAll(tools)
}

/**
 * Execute a tool using the global registry
 */
export async function executeGlobalTool(toolCall: ToolCall): Promise<ToolResult> {
  return getGlobalToolRegistry().execute(toolCall)
}

/**
 * Get Gemini function declarations from global registry
 */
export function getGlobalFunctionDeclarations(): FunctionDeclaration[] {
  return getGlobalToolRegistry().toGeminiFunctionDeclarations()
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique call ID for tool executions
 */
export function generateCallId(toolName: ToolName): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${toolName}_${timestamp}_${random}`
}

/**
 * Create a tool call object
 */
export function createToolCall(
  toolName: ToolName,
  params: any,
  callId?: string
): ToolCall {
  return {
    toolName,
    params,
    callId: callId || generateCallId(toolName),
  }
}
