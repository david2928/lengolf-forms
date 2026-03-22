// Hook: Remind to update database schema skill when creating migrations
let buf = '';
process.stdin.on('data', c => buf += c);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(buf);
    const filePath = data.tool_input?.file_path || '';
    if (/supabase[/\\]migrations[/\\].*\.sql/.test(filePath)) {
      console.log(JSON.stringify({
        systemMessage: 'Migration created. Update .claude/skills/database-schema/SKILL.md with new tables/columns/functions.'
      }));
    }
  } catch (e) {
    // Silently ignore parse errors
  }
});
