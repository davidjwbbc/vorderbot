#!/usr/bin/python
#
# Vorderbot equation checker based on the arithmetic expression parser example
# by Paul McGuire.
#
# This program checks to see if a string looks like an integer equation and if
# it is returns the result and a list of the integers used. If the string does
# not parse or the equation fails (non-integer divide, divide by zero, etc.)
# then -1 is returned as the answer to indicate an error.
#
# Vorderbot can then check this against its current set of active numbers games.#

import operator
from pyparsing import *
import sys

if len(sys.argv) != 2:
    print '-1'
    sys.exit(0)

__used_ints__ = []

def parse_action_int(toks):
    ret = int(toks[0])
    global __used_ints__
    __used_ints__ += [ret]
    return ret

integer = Word(nums).setParseAction(parse_action_int)

multop = oneOf('* /')
plusop = oneOf('+ -')

def check_and_div(a,b):
    if a % b != 0:
        raise ValueError("division must yield integer result")
    return a / b

ops = {
    '*': operator.mul,
    '/': check_and_div,
    '+': operator.add,
    '-': operator.sub,
    }

def parse_action(tokens):
    a = tokens[0]
    while len(a) > 1:
        a = [ops[a[1]](a[0],a[2])] + a[3:]
    return a[0]

expr = infixNotation( integer,
    [
     (multop, 2, opAssoc.LEFT, parse_action),
     (plusop, 2, opAssoc.LEFT, parse_action),
    ])

try:
    ans = expr.parseString(sys.argv[1], parseAll=True)[0]
except (ParseException, ValueError, ZeroDivisionError):
    ans = -1

print "%i %s"%(ans, ' '.join(['%i'%i for i in __used_ints__]))
