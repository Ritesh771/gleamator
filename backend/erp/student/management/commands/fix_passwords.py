from django.core.management.base import BaseCommand
from student.models import User


class Command(BaseCommand):
    help = 'Fix users whose password appears to be stored in plaintext by re-hashing it.'

    def handle(self, *args, **options):
        updated = 0
        total = 0
        for u in User.objects.all():
            total += 1
            pwd = (u.password or '').strip()
            # Django hashed passwords contain at least one '$' and algorithm name
            if not pwd or '$' not in pwd:
                # assume plaintext, re-hash
                raw = pwd
                u.set_password(raw or 'password')
                u.save()
                updated += 1
                self.stdout.write(self.style.SUCCESS(f'Updated password for user: {u.username}'))

        self.stdout.write(self.style.SUCCESS(f'Done. Scanned {total} users, updated {updated} users.'))
