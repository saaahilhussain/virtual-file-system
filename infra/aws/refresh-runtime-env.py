#!/usr/bin/env python3
"""Refresh the backend's private .env from encrypted SSM configuration."""
import argparse
import json
import os
import pathlib
import re
import boto3


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target', default='/home/ubuntu/file-shelter/server/.env')
    args = parser.parse_args()
    names = ['/file-shelter/demo/server-env', '/file-shelter/demo/cloudfront-private-key']
    client = boto3.Session(region_name='ap-south-1').client('ssm')
    payload = client.get_parameters(Names=names, WithDecryption=True)
    if payload.get('InvalidParameters'):
        raise RuntimeError('Runtime configuration parameters are missing')
    parameters = {p['Name']: p['Value'] for p in payload['Parameters']}
    env = json.loads(parameters[names[0]])
    env['CLOUDFRONT_PRIVATE_KEY'] = parameters[names[1]]
    if not all(re.fullmatch(r'[A-Z][A-Z0-9_]*', key) for key in env):
        raise RuntimeError('Unexpected environment variable name')
    target = pathlib.Path(args.target)
    if target.name != '.env' or not target.parent.is_dir():
        raise RuntimeError('Expected an existing backend directory and .env target')
    os.umask(0o077)
    temporary = target.with_name('.env.tmp')
    temporary.write_text(''.join(f'{key}={json.dumps(str(value), ensure_ascii=False)}\n' for key, value in env.items()))
    temporary.chmod(0o600)
    temporary.replace(target)
    print('Backend .env refreshed')


if __name__ == '__main__':
    main()