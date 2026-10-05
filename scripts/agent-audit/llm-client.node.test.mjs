import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAssistantText,
  toolCallsToAgentJson,
  emptyContentHint,
  isReasoningOnlyResponse
} from './llm-client.mjs';

describe('agentAuditLlmClient', () => {
  it('extractAssistantText reads OpenAI message content', () => {
    const text = extractAssistantText({
      choices: [{ message: { content: '{"type":"tool","name":"grep","args":{}}' } }]
    });
    assert.match(text, /grep/);
  });

  it('extractAssistantText maps native tool_calls to agent JSON', () => {
    const text = extractAssistantText({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                function: {
                  name: 'read_file',
                  arguments: '{"filePath":"src/background.ts"}'
                }
              }
            ]
          }
        }
      ]
    });
    const parsed = JSON.parse(text);
    assert.equal(parsed.type, 'tool');
    assert.equal(parsed.name, 'read_file');
    assert.equal(parsed.args.filePath, 'src/background.ts');
  });

  it('emptyContentHint describes missing content', () => {
    const hint = emptyContentHint({
      choices: [{ finish_reason: 'stop', message: { content: null, tool_calls: [] } }]
    });
    assert.match(hint, /finish_reason=stop/);
  });

  it('toolCallsToAgentJson returns empty without calls', () => {
    assert.equal(toolCallsToAgentJson({ content: 'hi' }), '');
  });

  it('toolCallsToAgentJson maps multiple tool_calls to batch', () => {
    const json = toolCallsToAgentJson({
      tool_calls: [
        { function: { name: 'grep', arguments: '{}' } },
        { function: { name: 'file_info', arguments: '{"filePath":"package.json"}' } }
      ]
    });
    const parsed = JSON.parse(json);
    assert.equal(parsed.type, 'batch');
    assert.equal(parsed.tools.length, 2);
  });

  it('isReasoningOnlyResponse detects empty content with reasoning_content', () => {
    assert.equal(
      isReasoningOnlyResponse({
        choices: [{ message: { content: '', reasoning_content: 'thinking…' } }]
      }),
      true
    );
  });
});
