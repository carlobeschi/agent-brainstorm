# wordfreq

Counts the most common words in a text: `topWords(text, n)` returns the `n`
most frequent words as `[word, count]` pairs.

    node src/cli.js data/sample.txt 10
    node --test

Rules: words are runs of letters (a to z, any case) and apostrophes inside a
word (`don't`); they are compared in lower case; apostrophes at the start or end
of a word are not part of it. Ties are broken alphabetically. `n` larger than
the number of words gives all of them.

## The report

> It works on a page of text, but on a whole book it never finishes.
> Other tools call `topWords` and print its result, so the output must not change.
