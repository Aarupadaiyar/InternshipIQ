import re

NAME_REGEX = re.compile(r'^[A-Z][a-zA-Z\-\']+(?:\s+[A-Z][a-zA-Z\.\-\']*)+$')
# Wait, "Aarupadaiyar K.J." has NO space between K. and J.
# Let's adjust to:
NAME_REGEX = re.compile(r'^[A-Z][a-zA-Z\-\']+(?:\s+[A-Z][a-zA-Z\.\-\']*)+(?:\.[A-Z])?$')
# Actually, let's just make it simpler for resumes: First name is capitalized, then spaces, then subsequent parts are capitalized or initials with dots.
# Initials can be clumped together like K.J.
NAME_REGEX = re.compile(r'^[A-Z][a-zA-Z\-\']+(?:\s+(?:[A-Z][a-zA-Z\-\']*|[A-Z]\.?)+)+$')

pass_cases = [
    "Aarupadaiyar KJ",
    "Aarupadaiyar K. J.",
    "Aarupadaiyar K.J.",
    "John D Smith"
]

for case in pass_cases:
    print(f"'{case}': {'PASS' if NAME_REGEX.match(case) else 'FAIL'}")
