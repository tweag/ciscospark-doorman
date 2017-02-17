export default ([...items]) => {
  const last = items.pop()
  const firstFew = items

  return `${firstFew.join(', ')} or ${last}`
}
