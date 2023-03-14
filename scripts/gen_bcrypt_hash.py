#!/usr/bin/python

import sys
import bcrypt

if len(sys.argv) != 2:
    print("Please supply password as first command line argument")
    sys.exit(1)

passwd = sys.argv[1].encode()
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(passwd, salt)

print(hashed.decode("ascii"))