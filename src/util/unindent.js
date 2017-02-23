export default str =>
  str
    .trim()
    .split("\n")
    .map( s => s.trim() )
    .join("\n")

